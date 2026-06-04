import AuthGate from "@/components/Auth/AuthGate";
import { isAuthDisabled } from "@/utils/auth";
import { redirect } from "next/navigation";

const page = () => {
    if (isAuthDisabled()) {
        redirect("/upload");
    }

    return <AuthGate />;
};

export default page;
