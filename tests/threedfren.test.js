const threedfren = require('../threedfren');

test('Load valid MPO file', async () => {
    await expect(() => threedfren.loadMpo('samples/DSCF8166.MPO')).not.toThrow();
});

test('Fail to load invalid MPO file', async () => {
    await expect(threedfren.loadMpo('samples/not_a_valid.MPO')).rejects.toThrow('Not a valid MPO file');
});

test('Left and right image buffers should be populated', async () => {
    await threedfren.loadMpo('samples/DSCF8166.MPO');
    expect(threedfren.leftImage).not.toBeNull();
    expect(threedfren.rightImage).not.toBeNull();
});
