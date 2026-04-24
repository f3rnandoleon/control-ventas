import mongoose from "mongoose";
import { AppError } from "@/shared/errors/AppError";

export function assertObjectId(value: string, message: string): void {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(message, 400);
    }
}