export function fixPunctuationSpacing(text) {
    return text.replace(/([.,!?])([^\s])/g, '$1 $2');
}