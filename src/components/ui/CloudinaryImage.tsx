"use client";

import { CldImage } from "next-cloudinary";

type CloudinaryImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export default function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority,
}: CloudinaryImageProps) {
  return (
    <CldImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      crop={{
        type: "auto",
        source: true,
      }}
    />
  );
}
