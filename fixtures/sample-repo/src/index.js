export function status() {
  return "fixture-ok";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(status());
}
