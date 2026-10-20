import CategoryEdit from "../[id]/page";

export const metadata = { title: "New category" };

export default function NewCategory() {
  return <CategoryEdit params={Promise.resolve({ id: "new" })} />;
}
