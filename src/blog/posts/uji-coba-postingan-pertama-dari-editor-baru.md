---
title: "Uji Coba: Postingan Pertama dari Editor Baru"
date: 2026-09-21
lang: id
translationKey: uji-coba-editor-baru
tags:
  - uji coba
description: >
  Postingan uji coba untuk memastikan alur tulis-terbit lewat editor visual
  berjalan dari awal sampai akhir.
---
**Artikel ini ditulis dan diterbitkan langsung dari editor visual, tanpa menyentuh terminal, tanpa commit manual.**



**Kalau tulisan ini muncul di halaman blog, berarti seluruh rantainya bekerja: editor → commit ke GitHub → build otomatis → terbit di situs.**



**\## Apa yang sedang diuji**



**Ada empat hal yang diperiksa lewat satu postingan ini:**



**1. \*\*Login editor\*\* — akun bisa masuk dan mengenali repo yang benar**

**2. \*\*Penyimpanan\*\* — frontmatter (judul, tanggal, tags, deskripsi) tersimpan sesuai format situs**

**3. \*\*Build otomatis\*\* — push dari editor memicu build tanpa campur tangan manual**

**4. \*\*Tampilan\*\* — artikel muncul di halaman blog dengan tanggal dan tautan yang benar**



**\## Kalau ada yang gagal**



**Bagian yang gagal menunjukkan di mana masalahnya:**



**\- \*\*Tidak bisa login\*\* → undangan Netlify Identity belum diterima atau Git Gateway belum aktif**

**\- \*\*Gagal menyimpan\*\* → koneksi ke GitHub terputus di sisi gateway**

**\- \*\*Tersimpan tapi situs tidak berubah\*\* → build gagal, perlu dilihat log-nya**

**\- \*\*Muncul tapi tampilannya aneh\*\* → frontmatter tidak sesuai format yang dibaca situs**



**\## Setelah ini**



**Kalau semua lolos, editor ini bisa dipakai untuk menulis sungguhan. Postingan uji coba ini boleh dihapus kapan saja — tombol hapusnya ada di daftar artikel di editor.**



**Prinsipnya sama seperti otomasi lain: buktikan satu alur kecil dari awal sampai akhir sebelum mempercayainya.**
