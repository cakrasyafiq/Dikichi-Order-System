# Folder Seed Data & Gambar Menu Dikichi

Taruh file CSV data menu dan file gambar di dalam folder ini:

1. **File CSV Menu**: Taruh di `Backend/catalog-service/seed-data/menu.csv` (kamu bisa menggunakan atau mengedit `menu_template.csv` sebagai acuan kolom).
2. **File Gambar Menu**: Taruh semua file gambar (`.jpg`, `.png`, `.webp`) di dalam subfolder `Backend/catalog-service/seed-data/images/`.

## Format Kolom CSV (`menu.csv`)

| Kolom | Wajib? | Penjelasan | Contoh |
| --- | :---: | --- | --- |
| `id` | Opsional | UUID item menu. Jika dikosongkan, akan dibuatkan UUID deterministik (`11111111-0000-4000-8000-000000000001`, dst.) | `11111111-0000-4000-8000-000000000001` |
| `outlet_id` | Opsional | Kode outlet (default: `OUT-01`) | `OUT-01` |
| `name` | **Wajib** | Nama menu (maks 100 karakter) | `Mie Suit` |
| `description` | Opsional | Deskripsi menu atau rincian isi paket (maks 500 karakter) | `Mie gurih dengan ayam cincang` |
| `price` | **Wajib** | Harga dalam bilangan bulat Rupiah (`1` s.d. `10000000`) | `25000` |
| `category` | **Wajib** | Kategori menu (`Mie`, `Dimsum`, `Minuman`, `Paket`, dll.) | `Mie` |
| `available` | Opsional | Status ketersediaan (`TRUE` / `FALSE`, default: `TRUE`) | `TRUE` |
| `image_filename` | Opsional | Nama file gambar yang ditaruh di folder `images/` | `mie-suit.jpg` |
