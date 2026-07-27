export type CartItem = {
  productId: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  extras: Array<{ id: string; name: string; price: number }>;
  extrasPrice: number;
  notes?: string | null;
  tableId?: string | null;
};

export type CustomerInfo = {
  name: string;
  email?: string;
  phone?: string;
};
