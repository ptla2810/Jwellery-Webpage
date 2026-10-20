import Image, { type ImageProps } from "next/image";

/** next/image wrapper: SVG illustrations are served as-is; raster uploads are optimised. */
export function ProductImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  return <Image {...props} unoptimized={props.unoptimized ?? src.endsWith(".svg")} alt={props.alt} />;
}
