const assert = require('node:assert/strict');
const fs = require('node:fs');

for (const file of ['index.html', 'admin.html', 'subject.html', 'exam.html', 'review.html']) {
    const html = fs.readFileSync(file, 'utf8');
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
        .map(match => match[1])
        .filter(script => script.trim());

    scripts.forEach((script, index) => {
        assert.doesNotThrow(
            () => new Function(script),
            `${file}: inline script ${index + 1} has invalid JavaScript`
        );
    });
}

console.log('Inline HTML scripts passed syntax checks.');
