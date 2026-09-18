export type CartItem = {
  productId: string
  productName: string
  supplierRef: string | null     // numéro article Biopartner (ex: 100040836)
  supplierId: string
  supplierName: string
  supplierType: string
  quantity: number
  unitPrice: number              // prix TTC catalogue, sans majoration
  unit: string
  minQuantity: number            // UC Biopartner : quantité minimum sans majoration
  allowsPartialOrder: boolean    // peut commander < UC avec +10 % (Biopartner)
}
