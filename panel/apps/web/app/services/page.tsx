import { redirect } from "next/navigation";

export default function LegacyServicesRedirect() {
    redirect("/apps?tab=services");
}
