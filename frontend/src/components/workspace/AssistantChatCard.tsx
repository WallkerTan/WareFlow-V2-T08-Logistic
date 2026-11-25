/*
 * From Uiverse.io by Cybercom682 - https://uiverse.io/Cybercom682/witty-goose-35
 * MIT License, Copyright (c) Cybercom682
 */
import { useEffect, useRef, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { Drawer } from 'antd';
import { X } from 'lucide-react';
import AssistantChatInput from './AssistantChatInput';
import AssistantLoader from './AssistantLoader';

type Props = {
    open: boolean;
    onClose: () => void;
    question: string;
    onQuestionChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    busy: boolean;
    scrollKey: string;
    children: ReactNode;
};

function subscribeConnectivity(change: () => void) {
    window.addEventListener('online', change);
    window.addEventListener('offline', change);
    return () => {
        window.removeEventListener('online', change);
        window.removeEventListener('offline', change);
    };
}

const networkAvailable = () => navigator.onLine;

const desktopQuery = '(min-width: 1200px)';
const dockAvailable = () => window.matchMedia(desktopQuery).matches;
function subscribeDock(change: () => void) {
    const media = window.matchMedia(desktopQuery);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
}

export default function AssistantChatCard({
    open, onClose, question, onQuestionChange, onSubmit, busy, scrollKey, children,
}: Props) {
    const messages = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const online = useSyncExternalStore(subscribeConnectivity, networkAvailable, () => true);
    const docked = useSyncExternalStore(subscribeDock, dockAvailable, () => false);

    useEffect(() => {
        const pane = messages.current;
        if (open && pane) pane.scrollTop = pane.scrollHeight;
    }, [open, scrollKey, docked]);

    useEffect(() => {
        if (open && docked) input.current?.focus();
    }, [open, docked]);

    const heading = (
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <div className="flex min-w-0 items-center gap-2">
                <img src="/tltl-logo.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg object-contain" />
                <div>
                    <h2 className="m-0 text-lg font-semibold text-zinc-800 dark:text-white">TLTN AI</h2>
                    <p className="m-0 text-xs text-zinc-600 dark:text-zinc-300">10 lượt nghiệp vụ · 20 lượt hỏi đáp mỗi ngày</p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <div className="grid size-[35px] shrink-0 place-items-center">
                    <AssistantLoader />
                </div>
                {!online && (
                    <span className="rounded-full bg-zinc-600 px-2 py-1 text-xs font-medium text-white">Ngoại tuyến</span>
                )}
                <button type="button" aria-label="Đóng TLTN AI" onClick={onClose}
                    className="grid size-7 place-items-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700">
                    <X size={16} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
    const chat = <>
        <div ref={messages} role="log" aria-label="Tin nhắn trợ lý" aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
            {children}
        </div>
        <AssistantChatInput inputRef={input} question={question} onQuestionChange={onQuestionChange}
            onSubmit={onSubmit} busy={busy} />
    </>;

    if (docked) {
        return open ? <aside className="tltl-docked-panel" aria-label="Trợ lý TLTN AI" onKeyDown={event => {
            if (event.key === 'Escape') onClose();
        }}>
            {heading}
            {chat}
        </aside> : null;
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            afterOpenChange={visible => { if (visible) input.current?.focus(); }}
            placement="right"
            mask={false}
            focusable={{ trap: false }}
            rootClassName="tltl-side-panel"
            closable={false}
            footer={null}
            size="min(436px, calc(100vw - 16px))"
            title={heading}
            styles={{
                header: { padding: 0, background: 'transparent' },
                body: { padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
            }}
            classNames={{ section: 'bg-white! dark:bg-zinc-800!' }}
        >
            {chat}
        </Drawer>
    );
}
