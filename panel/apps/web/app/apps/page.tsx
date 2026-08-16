import { redirect } from "next/navigation";

export default function AppsRedirect({
    searchParams,
}: {
    searchParams: { tab?: string };
}) {
    if (searchParams.tab === "apps") {
        redirect("/ai");
    }
    redirect("/services");
}
