
import { Suspense } from "react";
import EditInstitutionPage from "@/components/Forms/EditInstitutionPage ";
import Spinner from "@/components/Spinner";

export default function EditInstitutionPageWrapper() {
  return (
    <Suspense fallback={<div><Spinner/></div>}>
   
      <EditInstitutionPage />
    </Suspense>
  );
}
