export interface Resume {
  id: string;
  jobSeekerId: string;
  fileUrl: string;
  label: string | null;
  fileSize: number | null;
  isPrimary: boolean;
  parsedText: string | null;
  createdAt: string;
  updatedAt: string | null;
}
