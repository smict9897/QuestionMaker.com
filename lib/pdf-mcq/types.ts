export type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageItems = {
  pageNumber: number;
  width: number;
  height: number;
  items: TextItem[];
};
