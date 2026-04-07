import { axiosInstance } from "./base-request";

export async function healthcheck(): Promise<{ message: string }> {
    try {
        console.log("axiosInstance: ", axiosInstance.defaults.baseURL);
        const response = await axiosInstance.get("/");
        console.log("response.data: ", response.data);
        return response.data;
    } catch {
        return { message: "Internal server error" };
    }
}
