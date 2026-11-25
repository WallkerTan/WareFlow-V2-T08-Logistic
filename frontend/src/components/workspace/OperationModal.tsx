import { useState, type ComponentProps } from 'react';
import { Modal } from '../admin/AdminUI';
import OperationForm from './OperationForm';

type Props = Omit<ComponentProps<typeof OperationForm>, 'onCancel' | 'onSaved' | 'onBusyChange'> & {
    title: string;
    onClose: () => void;
};

export default function OperationModal({ title, onClose, ...form }: Props) {
    const [busy, setBusy] = useState(false);
    const cancel = () => { if (!busy) onClose(); };

    return <Modal title={title} onClose={cancel} wide>
        <OperationForm {...form} onCancel={cancel} onSaved={onClose} onBusyChange={setBusy} />
    </Modal>;
}
