import axios from "axios";
import { baseURL } from "../config";

export const axiosInstance = axios.create({
  baseURL: baseURL || undefined,
});
