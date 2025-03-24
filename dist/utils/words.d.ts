interface Word {
    word: string;
    start: number;
    end: number;
}
interface Segment {
    words: Word[];
}
interface Clip {
    segments: Segment[];
    audioBase64: string;
}
export declare function extractWords(clip: Clip): Word[];
export {};
