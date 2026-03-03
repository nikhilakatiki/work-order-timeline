/** Document structure for a work center (manufacturing station). */
export interface WorkCenterDocument {
  docId: string;
  docType: 'workCenter';
  data: {
    name: string;
  };
}
