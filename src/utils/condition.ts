const booleanExpressions = new Map<string, () => boolean>();

export function compileBooleanExpression(expression: string): () => boolean {
  const cached = booleanExpressions.get(expression);
  if (cached) return cached;

  const evaluate = new Function(`return (${expression});`) as () => unknown;
  const condition = (): boolean => Boolean(evaluate());
  booleanExpressions.set(expression, condition);
  return condition;
}
