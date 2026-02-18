import { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, RotateCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCropperProps {
    imageSrc: string;
    onConfirm: (croppedBlob: Blob) => void;
    onCancel: () => void;
    cropText?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: "%",
                width: 90,
            },
            16 / 9, // Initial aspect, but we don't strictly enforce it
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
}

export function ImageCropper({ imageSrc, onConfirm, onCancel, cropText }: ImageCropperProps) {
    const [internalSrc, setInternalSrc] = useState(imageSrc);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset internal src if prop changes
    useEffect(() => {
        setInternalSrc(imageSrc);
    }, [imageSrc]);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        // Set initial crop to cover most of the image
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                undefined, // Free aspect
                width,
                height
            ),
            width,
            height
        );
        setCrop(initialCrop);
    };

    const handleRotate = async () => {
        if (!imgRef.current) return;

        const image = imgRef.current;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        // We rotate 90 degrees clockwise
        // New width = old height, New height = old width
        canvas.width = image.naturalHeight;
        canvas.height = image.naturalWidth;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const newUrl = URL.createObjectURL(blob);
            setInternalSrc(newUrl);
            // Clean up old URL if needed, though browsers handle blob URLs okay mostly.
            // Ideally we revoke old ones if we generated them.
        }, "image/jpeg");
    };

    const handleConfirm = async () => {
        const image = imgRef.current;
        const crop = completedCrop;

        if (!image || !crop) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = crop.width * scaleX;
        canvas.height = crop.height * scaleY;

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob((blob) => {
            if (!blob) {
                console.error("Canvas is empty");
                return;
            }
            onConfirm(blob);
        }, "image/jpeg");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-background rounded-xl overflow-hidden max-w-2xl w-full flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <button onClick={onCancel} className="p-2 hover:bg-secondary rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={handleRotate}>
                            <RotateCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-black/5 min-h-[300px]">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        className="max-h-[60vh]"
                    >
                        <img
                            ref={imgRef}
                            src={internalSrc}
                            alt="Crop me"
                            onLoad={onImageLoad}
                            className="max-w-full max-h-[60vh] object-contain"
                        />
                    </ReactCrop>

                    <p className="mt-4 text-sm text-muted-foreground font-medium text-center">
                        {cropText || "Crop the problem you want to solve"}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-end">
                    <Button onClick={handleConfirm} className="gap-2">
                        <Check className="w-4 h-4" />
                        확인
                    </Button>
                </div>
            </div>
        </div>
    );
}
