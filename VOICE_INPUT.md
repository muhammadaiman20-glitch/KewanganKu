# Input Suara KewanganKu

Butang **Input Suara** tersedia di atas kandungan setiap skrin. Tekan, benarkan mikrofon, sebut arahan, tekan **Henti**, kemudian **Semak rekod**. Betulkan medan jika perlu dan tekan **Simpan rekod**. Rakaman tidak menyimpan rekod secara automatik.

Contoh:
- `Tambah perbelanjaan makan tengah hari RM 15`
- `Tambah perbelanjaan parking 5 ringgit`
- `Isi minyak Shell RON95 RM60 30 liter odometer 38900`

Pilih kenderaan dan lengkapkan jumlah, liter, jenis minyak, stesen serta odometer sebelum menyimpan log minyak. Medan yang tidak disebut kekal kosong. Jumlah wang memerlukan penanda RM/ringgit; nombor lain tidak dianggap wang. Jika pengecaman menghasilkan perkataan nombor, betulkan kepada digit pada borang semakan. Tarikh lalai ialah tarikh tempatan hari ini dan boleh diubah.

Perbelanjaan muncul dalam senarai dashboard dan jumlah bulanan dashboard/analisis; termasuk dalam backup JSON dan CSV lengkap. Rekod masih disimpan dalam localStorage pelayar sedia ada, bukan pangkalan data awan. Memadam data pelayar boleh memadam rekod. Gunakan sandaran JSON.

Pengecaman menggunakan Web Speech API bahasa `ms-MY`, bergantung pada sokongan pelayar dan perkhidmatan pengecaman. Sesetengah pelayar menghantar audio kepada perkhidmatan mereka; internet mungkin diperlukan. Buka melalui HTTPS atau localhost. Jika tidak disokong, mikrofon ditolak atau rangkaian gagal, arahan boleh ditaip. Tiada kunci Gemini diperlukan untuk ciri ini.

Pembangunan (Node 24):
```
npm install
npm test
npm run lint
npm run build
npm run dev
```

Ujian automatik memeriksa parser dan migrasi/simpanan. Ujian mikrofon fizikal: benarkan/tolak akses, sebut kedua-dua contoh, hentikan rakaman, semak, simpan, muat semula dan pastikan rekod kekal tanpa pendua. Cuba juga batal dan pelayar tanpa SpeechRecognition.
