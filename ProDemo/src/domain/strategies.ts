export interface SearchStrategy<TCriteria, TItem> {
  match(item: TItem, criteria: TCriteria): boolean;
}

export class ContainsSearchStrategy<TItem extends Record<string, unknown>>
  implements SearchStrategy<string, TItem>
{
  match(item: TItem, criteria: string): boolean {
    const haystack = JSON.stringify(item).toLowerCase();
    return haystack.includes(criteria.toLowerCase());
  }
}

export class PrefixSearchStrategy<TItem extends Record<string, unknown>>
  implements SearchStrategy<string, TItem>
{
  match(item: TItem, criteria: string): boolean {
    const haystack = JSON.stringify(item).toLowerCase();
    return haystack.startsWith(criteria.toLowerCase());
  }
}

export class ExactSearchStrategy<TItem extends Record<string, unknown>>
  implements SearchStrategy<string, TItem>
{
  match(item: TItem, criteria: string): boolean {
    return JSON.stringify(item) === criteria;
  }
}

export interface ExportStrategy<TData> {
  render(data: TData): string | Uint8Array;
}

export class CsvExportStrategy<TData extends Record<string, unknown>[]>
  implements ExportStrategy<TData>
{
  render(data: TData): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

export class PdfExportStrategy<TData> implements ExportStrategy<TData> {
  render(_data: TData): Uint8Array {
    // Placeholder PDF rendering.
    return new TextEncoder().encode('PDF content placeholder');
  }
}
