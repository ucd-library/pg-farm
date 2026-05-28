class BlobUtils {

  toBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  toDataUrl(buffer, mimeType) {
    if ( !buffer || !mimeType ) return '';

    // convert json serialized buffer to base64 data URL
    if (Array.isArray(buffer.data)) {
      const uint8Array = new Uint8Array(buffer.data);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      return `data:${mimeType};base64,${base64}`;
    }

    // if already base64 string
    if (typeof buffer === 'string' && !buffer.startsWith('data:')) {
      return `data:${mimeType};base64,${buffer}`;
    }

    // if already a data URL
    if (typeof buffer === 'string' && buffer.startsWith('data:')) {
      return buffer;
    }
    return '';
  }

  /**
   * @description Utility function to trigger a file download of JSON data.
   * @param {*} data - JSON serializable data to be downloaded as a file
   * @param {String} filename - The name of the file to be downloaded
   */
  downloadJsonAsFile(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  

}

export default new BlobUtils();
