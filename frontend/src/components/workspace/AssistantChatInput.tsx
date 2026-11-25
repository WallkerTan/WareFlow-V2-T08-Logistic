/*
 * From Uiverse.io by Cobp - https://uiverse.io/Cobp/cowardly-goat-90
 * MIT License, Copyright (c) Cobp (Fabio Cobb)
 */
import { useState, type FormEvent, type Ref } from 'react';
import { ArrowUp, AudioLines, Camera, FolderOpen, Image as ImageIcon, Plus } from 'lucide-react';
import './assistantChatInput.css';

type Props = {
    inputRef: Ref<HTMLInputElement>;
    question: string;
    onQuestionChange: (text: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    busy: boolean;
};

export default function AssistantChatInput({ inputRef, question, onQuestionChange, onSubmit, busy }: Props) {
    const [voice, setVoice] = useState(false);
    const [files, setFiles] = useState(false);
    const hasText = Boolean(question.trim());

    return (
        <div className="shrink-0 border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <form className="tltl-composer" data-voice={voice} data-files={files} data-has-text={hasText} onSubmit={onSubmit}>
                <label htmlFor="assistant-question" className="sr-only">Câu hỏi hoặc yêu cầu</label>
                <input id="assistant-question" ref={inputRef} type="text" required maxLength={1500}
                    value={question} onChange={event => onQuestionChange(event.target.value)}
                    readOnly={busy || voice} placeholder="Hỏi TLTN AI…" className="tltl-composer__input" />
                <div className="tltl-composer__shortcuts" aria-hidden="true">
                    <Camera size={20} /><ImageIcon size={20} /><FolderOpen size={20} />
                </div>
                <button type="button" className="tltl-composer__files" aria-label="Tùy chọn đính kèm"
                    aria-expanded={files} disabled={busy} onClick={() => setFiles(value => !value)}>
                    <Plus size={24} aria-hidden="true" />
                </button>
                {files && <div className="tltl-composer__file-popover" role="status">
                    TLTN AI hiện hỗ trợ tin nhắn văn bản.
                </div>}
                <button type="button" className="tltl-composer__voice"
                    aria-label={voice ? 'Đóng chế độ giọng nói' : 'Mở chế độ giọng nói'} aria-pressed={voice}
                    disabled={busy} onClick={() => { setFiles(false); setVoice(value => !value); }}>
                    <AudioLines className="tltl-composer__voice-icon" size={24} aria-hidden="true" />
                    {voice && <>
                        <span className="tltl-composer__orb" aria-hidden="true">
                            <span className="tltl-composer__orb-core">
                                <span className="tltl-composer__orb-color tltl-composer__orb-color--four" />
                                <span className="tltl-composer__orb-color tltl-composer__orb-color--one" />
                                <span className="tltl-composer__orb-color tltl-composer__orb-color--two" />
                                <span className="tltl-composer__orb-color tltl-composer__orb-color--three" />
                                <span className="tltl-composer__orb-rings" />
                            </span>
                            <span className="tltl-composer__orb-glass" />
                        </span>
                        <span className="tltl-composer__voice-copy">
                            <span>Chế độ giọng nói</span>
                            <small>Chưa hỗ trợ thu âm · Bấm để đóng</small>
                        </span>
                    </>}
                </button>
                <button type="submit" className="tltl-composer__send" disabled={busy || voice || !hasText} aria-label="Gửi">
                    <ArrowUp size={24} aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}
