export async function extractCleanTwoColumnPdf(file: File): Promise<string> {
  if (typeof window === "undefined") return "";

  const pdfjsLib: any = await new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) return resolve((window as any).pdfjsLib);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(lib);
    };
    script.onerror = () => reject(new Error("PDF.js লোড হয়নি"));
    document.head.appendChild(script);
  });

  const arrayBuffer = await file.arrayBuffer();

  // CMap যুক্ত করা হলো যাতে বাংলা যুক্তাক্ষর না ভাঙে
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    const items = textContent.items as any[];
    const xValues = items.map(it => it.transform[4]);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const width = maxX - minX;
    
    let columns: any[][] = [[]];
    
    if (width > viewport.width * 0.4) {
        const colGap = 15;
        const midX = viewport.width / 2;
        const col1: any[] = [];
        const col2: any[] = [];
        
        items.forEach((item: any) => {
            const x = item.transform[4];
            if (x < midX - colGap) col1.push(item);
            else if (x > midX + colGap) col2.push(item);
            else (item.width > 50 ? col1 : col2).push(item); 
        });
        
        if (col1.length > 5 && col2.length > 5) {
            columns = [col1, col2];
        } else {
            columns = [items];
        }
    } else {
        columns = [items]; 
    }

    const buildCol = (colItems: any[]) => {
      if (!colItems.length) return "";
      colItems.sort((a, b) => {
          if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
              return b.transform[5] - a.transform[5]; 
          }
          return a.transform[4] - b.transform[4]; 
      });
      
      let res = colItems[0].str;
      let currentY = colItems[0].transform[5];
      let lastXEnd = colItems[0].transform[4] + colItems[0].width;

      for (let i = 1; i < colItems.length; i++) {
        const it = colItems[i];
        const y = it.transform[5];
        const x = it.transform[4];
        
        if (Math.abs(y - currentY) > 6) {
          res += "\n" + it.str;
          currentY = y;
          lastXEnd = x + it.width;
        } else {
          res += (x - lastXEnd > 4 ? " " : "") + it.str;
          lastXEnd = Math.max(lastXEnd, x + it.width);
        }
      }
      return res;
    };

    columns.forEach((col) => {
        fullText += `\n${buildCol(col)}\n`;
    });
  }

  fullText = fullText.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return fullText;
}
