import {getPathSegment} from "../src/index";

describe("#getPathSegment", () => {
    test("should always add leading slash", () => {
        // tests for issue #11
        expect(getPathSegment("test", false)).toBe("/test");
        expect(getPathSegment("/test", false)).toBe("/test");
    });
    test("should remove/append tailing slash", () => {
        // tests for issue #11
        expect(getPathSegment("test/", false)).toBe("/test");
        expect(getPathSegment("test/", true)).toBe("/test/");
        expect(getPathSegment("test", false)).toBe("/test");
        expect(getPathSegment("test", true)).toBe("/test/");
    });
});
