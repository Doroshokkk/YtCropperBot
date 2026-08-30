import { Schema, model } from "mongoose";

export interface Payment {
    tg_id: number;
    charge_id: string;
    amount: number;
    created_at?: string;
}

const paymentSchema = new Schema<Payment>(
    {
        tg_id: { type: Number, required: true },
        charge_id: { type: String, required: true, unique: true },
        amount: { type: Number, required: true },
        created_at: { type: String, default: () => new Date().toLocaleString() },
    },
    { collection: "payments" },
);

export const PaymentModel = model<Payment>("Payment", paymentSchema);
