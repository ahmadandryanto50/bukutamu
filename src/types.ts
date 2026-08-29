export interface GuestEntry {
  id: string;
  waktu: string;
  kategori: 'Umum' | 'Khusus';
  nama: string;
  jk: 'Laki-laki' | 'Perempuan';
  instansi: string;
  tujuan: string;
  keperluan: string;
  saran?: string;
  nohp: string;
}

export type ThemeMode = 'light' | 'dark';

export type ActiveTab = 'form' | 'admin';
