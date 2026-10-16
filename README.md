# AMARESH Invoice Generator

A responsive invoice generator built with plain HTML, CSS, and JavaScript. It follows the general layout of the supplied AMARESH invoice sample.

## Features
- Sequential invoice numbers (`00000001`, `00000002`, ...) assigned when a new invoice is saved.
- Three predefined service descriptions:
  - Tax Audit Fees FY 25-26
  - Income Tax Returns FY 25-26
  - Income Tax Notice FY 25-26
- `Other` option for custom service descriptions.
- Multiple item rows, quantities, prices, tax percentages, discounts, and automatic totals.
- Customer and business details.
- Saved invoice history with search, open, print, and delete actions.
- Print layout designed for A4 paper; use the browser's **Save as PDF** option.
- Uses browser `localStorage`; no server setup required.

## Run
1. Extract the ZIP file.
2. Open `index.html` in a modern browser (Chrome or Edge recommended).
3. Fill in the customer and item details.
4. Click **Save invoice**. The first saved invoice receives `00000001`; later new invoices increment the number.
5. Click **Print / Save PDF**, then select a printer or **Save as PDF** in the browser print dialog.

## Important notes
- Invoice history is stored only in the current browser/device. Clearing browser data may remove it. Export or back up data before using this for important business records.
- This is a client-side demo. Two devices or users do not share the invoice counter. For multi-user production use, use a backend/database and server-side sequence allocation.
- GST is calculated as `price × quantity × tax rate`. CGST/SGST versus IGST, GST registration details, HSN/SAC, place of supply, and other statutory fields are not included. Confirm invoice requirements with a qualified accountant before issuing tax invoices.
- The sample had a mismatch on the Income Tax Returns line (price ₹2,000 versus amount ₹3,000). This app calculates the amount from entered price, quantity, and tax, so verify values before saving.


## Adding extra items
Use the gold-outlined **＋ Add Item** button directly below the item rows. Each added row is automatically numbered in the invoice preview and included in calculations and printing.


## Full-page invoice and payment QR
The print layout is designed to use the A4 page more fully, with a payment QR section near the bottom. The supplied QR image is stored as `payment-qr.png`; keep it in the same folder as `index.html`. Test-scan the QR and confirm it opens the correct payment destination before using it for actual payments.


## Print layout fix
The invoice table is explicitly kept as a full-width HTML table in print layout so the item headings and item rows align. The 'Thank you for your business' footer has been removed as requested.


## Print readability update
Removed the terms and payment-status block from the invoice preview. The total is now right-aligned in that area and typography has been enlarged for clearer A4 printing. The terms textarea in the editor remains available but is not printed on the invoice.


## Functionality fix
Fixed a JavaScript error caused by references to the removed terms/payment-status preview fields. The error prevented invoice preview updates and interrupted initialization, which made the Add Item button and amount calculation appear broken. Those stale references are removed in this build.


## Editor-side total
A live INVOICE TOTAL display now appears directly under the Add Item button in the item-entry panel and updates whenever item prices, quantities, taxes, or discount change.


## Larger invoice fonts
Increased typography for the invoice title, business and customer details, line-item table, total amount, and payment QR instructions. Print styles preserve readable font sizes on A4.


## Total alignment
The invoice total panel is aligned to the left side in both preview and print/PDF output.


## Total label and amount alignment
The TOTAL label is left-aligned within the total panel, while the calculated currency amount is right-aligned. This applies to preview and print/PDF.


## Larger invoice total
Increased the TOTAL label and calculated amount significantly, using a heavier font weight and more spacing for readability on A4 print/PDF. The label stays on the left and amount on the right.


## Extra-bold total styling
The TOTAL label is now extra-bold and the calculated amount uses a heavier 900 font weight with a larger size (39px preview, 36px print), stronger spacing, and a thicker gold underline.


## Oversized total amount
The calculated invoice amount is now 46px in the preview and 42px for A4 print, extra-bold, to match the larger number styling requested. The TOTAL label remains left aligned and the number remains right aligned.
