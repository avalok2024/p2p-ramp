/** Admin list endpoints return `{ items: T[], total: number }` */
export function adminItems<T>(res: { data?: { items?: T[]; total?: number } }): T[] {
  const items = res.data?.items;
  return Array.isArray(items) ? items : [];
}

export function adminTotal(res: { data?: { total?: number } }): number {
  return typeof res.data?.total === 'number' ? res.data.total : 0;
}
