async function execWrapper(prom) {
  try {
    return await prom
  } catch (e) {
    if( e instanceof Error ) {
      return {payload: {
        error: true, message: e.message, stack: e.stack}
      };
    }
    return e;
  }
}

export default execWrapper;