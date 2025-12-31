import { Metadata } from "next";
import Otherspages from "./OthersClient";

export const metadata: Metadata = {
  title: "Others | Admin Panel",
  description: "Manage data imports, sources, and institution filters",
};
export default async function OtherPage() {
  return (
    <Otherspages />
  );
}
