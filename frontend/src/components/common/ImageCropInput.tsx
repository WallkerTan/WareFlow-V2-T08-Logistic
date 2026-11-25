import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import './image-crop.css';

export const imageSizes = {
    avatar: [512, 512],
    warehouse: [1200, 600],
    product: [960, 720],
} as const;

type Size = readonly [number, number];
type Point = { x: number; y: number };
const center = { x: 0, y: 0 };
const maxFileSize = 10 * 1024 * 1024;

export function ImageCropInput({ size, label, disabled, preview, onCrop }: {
    size: Size;
    label: string;
    disabled?: boolean;
    preview?: string;
    onCrop: (file: File) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');

    return (
        <div>
            {preview && <img className="wf-crop-preview" src={preview} alt="Ảnh hiện tại"
                style={{ aspectRatio: `${size[0]} / ${size[1]}` }} />}
            <label className="wf-field">
                <span>{label}</span>
                <input type="file" accept="image/*" disabled={disabled} onChange={event => {
                    const selected = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (!selected) return;
                    if (selected.size > maxFileSize) {
                        setError('Ảnh tối đa 10 MB.');
                        return;
                    }
                    setError('');
                    setFile(selected);
                }} />
            </label>
            {error && <p role="alert">{error}</p>}
            {file && <CropDialog file={file} size={size} onClose={() => setFile(null)} onCrop={crop => {
                setFile(null);
                onCrop(crop);
            }} />}
        </div>
    );
}

function CropDialog({ file, size, onClose, onCrop }: {
    file: File;
    size: Size;
    onClose: () => void;
    onCrop: (file: File) => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const image = useRef<HTMLImageElement>(null);
    const drag = useRef<{ id: number; start: Point; position: Point } | null>(null);
    const [source, setSource] = useState('');
    const [naturalSize, setNaturalSize] = useState<Size>();
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState<Point>(center);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [width, height] = size;
    const [naturalWidth, naturalHeight] = naturalSize ?? size;
    const scale = Math.max(width / naturalWidth, height / naturalHeight) * zoom;
    const imageWidth = naturalWidth * scale;
    const imageHeight = naturalHeight * scale;
    const limitX = Math.max(0, (imageWidth - width) / 2);
    const limitY = Math.max(0, (imageHeight - height) / 2);
    const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
    const x = clamp(position.x, limitX);
    const y = clamp(position.y, limitY);
    const left = (width - imageWidth) / 2 + x;
    const top = (height - imageHeight) / 2 + y;

    useEffect(() => {
        const url = URL.createObjectURL(file);
        const element = dialog.current;
        setSource(url);
        element?.showModal();
        return () => {
            element?.close();
            URL.revokeObjectURL(url);
        };
    }, [file]);

    function move(event: PointerEvent<HTMLDivElement>) {
        if (drag.current?.id !== event.pointerId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({
            x: clamp(drag.current.position.x + (event.clientX - drag.current.start.x) * width / rect.width, limitX),
            y: clamp(drag.current.position.y + (event.clientY - drag.current.start.y) * height / rect.height, limitY),
        });
    }

    function moveByKey(event: KeyboardEvent<HTMLDivElement>) {
        const steps: Record<string, Point> = {
            ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        };
        const step = steps[event.key];
        if (!step) return;
        event.preventDefault();
        setPosition({ x: clamp(x + step.x * width / 50, limitX), y: clamp(y + step.y * height / 50, limitY) });
    }

    function save() {
        if (!naturalSize || !image.current || saving) return;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            setError('Trình duyệt không thể cắt ảnh.');
            return;
        }
        setSaving(true);
        context.drawImage(image.current, left, top, imageWidth, imageHeight);
        canvas.toBlob(blob => {
            setSaving(false);
            if (!blob) {
                setError('Không thể tạo ảnh đã cắt.');
                return;
            }
            const extension = blob.type === 'image/webp' ? 'webp' : 'png';
            onCrop(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, { type: blob.type }));
        }, 'image/webp', 0.92);
    }

    return (
        <dialog ref={dialog} className="wf-crop-dialog" aria-label="Căn chỉnh ảnh"
            onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
            onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
            <h2>Căn chỉnh ảnh</h2>
            <p>Kéo ảnh hoặc dùng phím mũi tên để căn phần muốn giữ lại.</p>
            <div
                className="wf-crop-frame"
                style={{ aspectRatio: `${width} / ${height}`, maxWidth: `min(100%, ${36 * width / height}dvh)` }}
                tabIndex={0}
                aria-label="Khung cắt ảnh"
                onPointerDown={event => {
                    if (!naturalSize || !event.isPrimary || event.button !== 0) return;
                    drag.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, position: { x, y } };
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={move}
                onLostPointerCapture={() => { drag.current = null; }}
                onKeyDown={moveByKey}
            >
                {source && <img
                    ref={image}
                    src={source}
                    alt=""
                    draggable={false}
                    style={{ width: `${imageWidth / width * 100}%`, height: `${imageHeight / height * 100}%`, left: `${left / width * 100}%`, top: `${top / height * 100}%` }}
                    onLoad={event => setNaturalSize([event.currentTarget.naturalWidth, event.currentTarget.naturalHeight])}
                    onError={() => setError('Không đọc được ảnh. Hãy chọn tệp ảnh khác.')}
                />}
            </div>
            <label className="wf-crop-zoom">
                <span>Thu phóng</span>
                <input type="range" min={1} max={3} step={0.01} value={zoom} disabled={!naturalSize || saving}
                    onChange={event => { setPosition({ x, y }); setZoom(event.currentTarget.valueAsNumber); }} />
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="wf-crop-actions">
                <button type="button" className="wf-button wf-button-secondary" disabled={saving} onClick={onClose}>Hủy</button>
                <button type="button" className="wf-button wf-button-primary" disabled={!naturalSize || saving} onClick={save}>Dùng ảnh này</button>
            </div>
        </dialog>
    );
}
