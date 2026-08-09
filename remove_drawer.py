with open('src/pages/dashboard/videos.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if 564 <= i <= 1435: # 0-indexed line numbers for lines 565 to 1436
        continue
    new_lines.append(line)

with open('src/pages/dashboard/videos.tsx', 'w') as f:
    f.writelines(new_lines)

print("Drawer removed successfully")
