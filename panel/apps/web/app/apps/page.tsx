import { redirect } from "next/navigation";

export default async function AppsRedirect({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const params = await searchParams;
    if (params?.tab === "apps") {
        redirect("/ai");
    }
    redirect("/services");
}
