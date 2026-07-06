const fs = require('fs');
let code = fs.readFileSync('components/DeliveryTracking.tsx', 'utf8');

code = code.replace(
  "  userSection?: string;\n}",
  "  userSections?: string[];\n}"
);

code = code.replace(
  "userRole, userSection",
  "userRole, userSections"
);

// We need to unlock the sectionFilter since they can view all, but restrict edits.
code = code.replace(
  "  const [sectionFilter, setSectionFilter] = useState(userSection || '');",
  "  const [sectionFilter, setSectionFilter] = useState('');"
);

code = code.replace(
  "            disabled={!!userSection}",
  "            // disabled={!!userSections?.length}" // Unlock so they can view other sections
);

fs.writeFileSync('components/DeliveryTracking.tsx', code);
console.log('Patched DeliveryTracking part 1');
