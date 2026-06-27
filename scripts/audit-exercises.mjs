import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CURRENT_VALIDATION_VERSION = 2;
const SUPABASE_BIN = process.platform === "win32" ? "supabase.cmd" : "supabase";

function query(sql) {
  const dir = mkdtempSync(join(tmpdir(), "matemathup-audit-"));
  const file = join(dir, "query.sql");
  try {
    writeFileSync(file, sql, "utf8");
    const out =
      process.platform === "win32"
        ? execSync(`${SUPABASE_BIN} db query --linked --file "${file}"`, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          })
        : execFileSync(SUPABASE_BIN, ["db", "query", "--linked", "--file", file], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          });
    const jsonStart = out.indexOf("{");
    if (jsonStart < 0) throw new Error(out);
    return JSON.parse(out.slice(jsonStart)).rows ?? [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const summary = query(`
  select
    count(*) filter (where approved = true) as approved,
    count(*) filter (
      where approved = true and validation_version < ${CURRENT_VALIDATION_VERSION}
    ) as needs_validation,
    count(*) filter (where approved = false) as rejected
  from public.exercises;
`);

const structural = query(`
  select id, type, correct_answer, options, validation_version, created_at
  from public.exercises e
  where approved = true
    and type = 'multiple_choice'
    and (
      options is null
      or jsonb_typeof(options) <> 'array'
      or jsonb_array_length(options) < 2
      or not exists (
        select 1
        from jsonb_array_elements_text(options) opt(value)
        where lower(trim(opt.value)) = lower(trim(e.correct_answer))
      )
    )
  order by created_at desc
  limit 50;
`);

const pending = query(`
  select id, type, correct_answer, validation_version, created_at
  from public.exercises
  where approved = true
    and validation_version < ${CURRENT_VALIDATION_VERSION}
  order by created_at desc
  limit 50;
`);

console.log("Exercise audit");
console.table(summary);

console.log("\nApproved multiple-choice exercises with structural answer/options issues");
console.table(structural);

console.log(`\nApproved exercises pending validator v${CURRENT_VALIDATION_VERSION}`);
console.table(pending);
