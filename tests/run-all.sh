#!/usr/bin/env bash
# Corre todas las pruebas de Fibra con Playwright (Chromium headless).
# Cada prueba levanta su propio servidor local con un mock de Supabase.
# Uso: bash tests/run-all.sh   → imprime solo FAIL y el estado final de cada una.
cd "$(dirname "$0")"
status=0
for t in *.test.js; do
  out=$(node "$t" 2>&1)
  if echo "$out" | grep -q "^FAIL\|Error"; then status=1; echo "✗ $t"; echo "$out" | grep "^FAIL\|Error" | head -5; else echo "✓ $t"; fi
done
exit $status
