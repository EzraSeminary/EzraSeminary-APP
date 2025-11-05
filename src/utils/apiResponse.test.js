import {normalizeArrayResponse} from './apiResponse';

describe('normalizeArrayResponse', () => {
  it('returns the array unchanged', () => {
    const input = [{id: 1}, {id: 2}];
    expect(normalizeArrayResponse(input)).toEqual(input);
  });

  it('extracts data array', () => {
    const input = {data: [{id: 'a'}]};
    expect(normalizeArrayResponse(input)).toEqual([{id: 'a'}]);
  });

  it('extracts items array', () => {
    const input = {items: [1, 2, 3]};
    expect(normalizeArrayResponse(input)).toEqual([1, 2, 3]);
  });

  it('extracts results array', () => {
    const input = {results: ['x']};
    expect(normalizeArrayResponse(input)).toEqual(['x']);
  });

  it('extracts devotions array', () => {
    const input = {devotions: [{_id: '1'}]};
    expect(normalizeArrayResponse(input)).toEqual([{_id: '1'}]);
  });

  it('extracts courses array', () => {
    const input = {courses: [{_id: 'c'}]};
    expect(normalizeArrayResponse(input)).toEqual([{_id: 'c'}]);
  });

  it('returns empty array for invalid input', () => {
    expect(normalizeArrayResponse(null)).toEqual([]);
    expect(normalizeArrayResponse(undefined)).toEqual([]);
    expect(normalizeArrayResponse({})).toEqual([]);
  });
});
