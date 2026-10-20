import CollectionEdit from "../[id]/page";

export const metadata = { title: "New collection" };

export default function NewCollection() {
  return <CollectionEdit params={Promise.resolve({ id: "new" })} />;
}
