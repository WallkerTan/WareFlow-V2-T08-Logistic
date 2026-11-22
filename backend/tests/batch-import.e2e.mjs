// Run after building the service bootJars: node backend/tests/batch-import.e2e.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../../', import.meta.url));
const project = 'wf-batch-test-' + randomUUID();
const ports = { core: 8081, inventory: 8082, finance: 8083 };
const services = {
    postgres: {
        image: 'postgres:16-alpine',
        environment: { POSTGRES_PASSWORD: 'postgres' },
        tmpfs: ['/var/lib/postgresql/data'],
        volumes: ['./backend/docker/postgres-init/init-databases.sql:/docker-entrypoint-initdb.d/init.sql:ro'],
        healthcheck: { test: ['CMD', 'pg_isready', '-U', 'postgres'], interval: '2s', retries: 30 },
    },
};
for (const [name, port] of Object.entries(ports)) {
    services[name + '-service'] = {
        build: './backend/' + name + '-service',
        ports: ['127.0.0.1::' + port],
        environment: {
            DB_HOST: 'postgres', DB_NAME: 'wareflow_' + name,
            CORE_SERVICE_URL: 'http://core-service:8081',
            INVENTORY_SERVICE_URL: 'http://inventory-service:8082',
            FINANCE_SERVICE_URL: 'http://finance-service:8083',
            EUREKA_CLIENT_ENABLED: 'false', SPRING_CLOUD_CONFIG_ENABLED: 'false',
        },
        depends_on: { postgres: { condition: 'service_healthy' } },
    };
}
function compose(...args) {
    return execFileSync('docker', ['compose', '-p', project, '-f', '-', ...args], {
        cwd: root, input: JSON.stringify({ services }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'],
    }).trim();
}
function sql(database, statement) {
    return compose('exec', '-T', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres',
        '-d', 'wareflow_' + database, '-Atc', statement);
}
const origins = {};
let token;
async function api(service, path, body, expected = 200) {
    const response = await fetch(origins[service] + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    const result = await response.text();
    assert.equal(response.status, expected, path + ' ' + (response.ok ? response.status : result));
    return result && JSON.parse(result);
}
try {
    compose('up', '-d', '--build');
    for (const [name, port] of Object.entries(ports)) {
        origins[name] = 'http://' + compose('port', name + '-service', String(port));
        const deadline = Date.now() + 180000;
        while (!(await fetch(origins[name] + '/actuator/health').then(r => r.ok).catch(() => false))) {
            assert.ok(Date.now() < deadline, name + ' failed to start');
            await delay(1000);
        }
    }
    const auth = await api('core', '/auth/register-company', { companyName: 'Import Test', fullName: 'Tester',
        address: 'Test', businessModel: 'TECH', email: 'test@example.org', password: randomUUID() }, 201);
    token = auth.accessToken;
    const company = auth.companyId, warehouse = randomUUID(), supplier = randomUUID(), product = randomUUID();
    sql('core', `insert into warehouses(id,owner_company_id,name,warehouse_type,status,region,address,area,price,handover,created_at)
        values('${warehouse}','${company}','Test','RENT','ACTIVE','Test','Test',100,1,'{}',now());
        insert into partners(id,kind,name,deleted,version,display_id,business_model)
        values('${supplier}','SUPPLIER','Test',false,0,100,'TECH');
        insert into supplier_products(id,supplier_id,name,sku,price,version)
        values('${product}','${supplier}','Test','TEST-1',100,0)`);
    const chatOrder = { requestId: randomUUID(), lines: [{ product: 'TEST-1', supplier: 'Test', quantity: 2 }] };
    const batch = await api('core', '/purchase-batches/from-chat', chatOrder);
    assert.equal(batch.total, 200);
    assert.equal((await api('core', '/purchase-batches/from-chat', chatOrder)).id, batch.id);
    await api('core', '/purchase-batches/from-chat', { ...chatOrder, lines: [{product:'TEST-1', quantity:3}] }, 409);
    assert.equal((await api('core', '/purchase-batches')).length, 1);
    console.log('PASS chat purchase order and retry');
    const path = '/warehouses/' + warehouse + '/batch-imports';
    const requestId = randomUUID(), request = { requestId, batchIds: [batch.id] };
    const order = path + '/' + requestId;
    const balance = async () => (await api('finance', '/wallets')).balance;
    const stock = () => sql('inventory', `select count(*) || ':' || coalesce(sum(quantity),0)::int from stock_lots where purchase_batch_id='${batch.id}'`);
    await api('inventory', path, request, 409);
    assert.equal((await api('inventory', order)).status, 'PENDING');
    assert.equal(await balance(), 0);
    assert.equal(stock(), '0:0');
    console.log('PASS insufficient funds');

    sql('finance', `insert into wallets(account,balance) values('company:${company}',1000)`);
    assert.equal((await api('inventory', order + '/approve', {})).status, 'DONE');
    assert.equal(await balance(), 790);
    assert.equal(stock(), '1:2');
    console.log('PASS funded approval including 5% fee');

    await api('inventory', path, request);
    await api('inventory', order + '/approve', {});
    await api('finance', '/wallets/settle/IMPORT/' + warehouse + '/' + requestId, {});
    assert.equal(await balance(), 790);
    assert.equal(stock(), '1:2');
    console.log('PASS retries preserve balance and stock');
} finally {
    compose('down', '--volumes', '--rmi', 'local');
}
