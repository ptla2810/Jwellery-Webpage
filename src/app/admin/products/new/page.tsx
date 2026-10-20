import { requirePermissionPage } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { editorOptions } from "../load";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requirePermissionPage("products.write", "/admin/products/new");
  const opts = await editorOptions();
  return (
    <div>
      <PageHeader title="New product" back={{ href: "/admin/products", label: "Products" }} description="Save as draft first, then add images and preview before publishing." />
      <ProductEditor
        {...opts}
        product={{ name: "", slug: "", sku: "", shortDescription: "", description: "", careInstructions: "", status: "DRAFT", primaryCategoryId: "", metalType: "YELLOW_GOLD", purity: "18K", gender: "WOMEN", style: "", gemstoneType: "", diamondClarity: "", diamondColor: "", diamondCarat: "", grossWeight: "", netWeight: "", certification: "", seoTitle: "", seoDescription: "", isPriceEstimated: false, isFeatured: false, isBestSeller: false, isTrending: false, isLightweight: false, categoryIds: [], collectionIds: [], variants: [], attributes: [] }}
      />
    </div>
  );
}
