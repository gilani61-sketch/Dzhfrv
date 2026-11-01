#!/usr/bin/env python3
"""
Связывает папки проекта с public/ движка.

Remotion отдаёт файлы только из engine/public/, а держать там копии
шрифтов, библиотеки и проектов — плохо: они разъедутся с оригиналами.
Поэтому ставим симлинки. Где симлинки недоступны (Windows без прав
разработчика) — честно копируем и говорим об этом.

    python3 scripts/setup_links.py
    python3 scripts/setup_links.py --copy    # принудительно копией
"""
import argparse, os, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "engine" / "public"

LINKS = {
    "fonts": ROOT / "brand" / "fonts",
    "lib": ROOT / "library",
    "proj": ROOT / "projects",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--copy", action="store_true",
                    help="копировать вместо симлинков")
    a = ap.parse_args()

    PUB.mkdir(parents=True, exist_ok=True)
    copied = []

    for name, target in LINKS.items():
        if not target.exists():
            print(f"  ✗ нет исходной папки {target}")
            continue
        dst = PUB / name

        # убираем что было, каким бы оно ни было
        if dst.is_symlink() or dst.is_file():
            dst.unlink()
        elif dst.is_dir():
            shutil.rmtree(dst)

        rel = os.path.relpath(target, PUB)
        if not a.copy:
            try:
                dst.symlink_to(rel, target_is_directory=True)
                print(f"  ✓ {name} → {rel}")
                continue
            except (OSError, NotImplementedError):
                pass                      # нет прав на симлинки — копируем

        shutil.copytree(target, dst)
        copied.append(name)
        print(f"  ✓ {name} (копия)")

    if copied:
        print("\n⚠ Симлинки недоступны, папки скопированы: " + ", ".join(copied))
        print("  Значит после правки шрифтов, библиотеки или кадров нужно")
        print("  заново выполнить: python3 scripts/setup_links.py --copy")
        print("  (на Windows симлинки включаются режимом разработчика)")
    else:
        print("\n✓ связано симлинками — правки подхватываются сразу")


if __name__ == "__main__":
    main()
