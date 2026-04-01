declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface CellDef {
    content?: string | number;
    colSpan?: number;
    rowSpan?: number;
    styles?: any;
  }

  interface ColumnDef {
    header?: string;
    dataKey?: string;
    [key: string]: any;
  }

  interface Config {
    head?: (string | CellDef)[][];
    body?: (string | number | CellDef)[][];
    foot?: (string | CellDef)[][];
    columns?: ColumnDef[];
    startY?: number;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
    theme?: 'striped' | 'grid' | 'plain';
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: { [key: number]: any };
    [key: string]: any;
  }

  export default function autoTable(doc: jsPDF, config: Config): void;
}
