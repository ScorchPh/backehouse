/**
 * ============================================================================
 * BAKE HOUSE - Thermal Printer Service (GOOJPRT PT-210, POS-58, ESC/POS & Browser)
 * ============================================================================
 * Supports:
 * 1. Web Bluetooth Direct Printing (GOOJPRT PT-210, MPT-II, POS-58 BLE/SPP)
 * 2. Web Serial / USB Cable Direct Printing (COM Port / USB-to-Serial)
 * 3. Clean 58mm / 80mm Hidden Iframe Printing (For Windows POS-58 / System Drivers)
 * 4. Raw ESC/POS 32-Column (58mm) & 48-Column (80mm) Receipt Generators
 * ============================================================================
 */

// Bluetooth GATT Services and Characteristics commonly used by GOOJPRT PT-210 and portable POS printers
const KNOWN_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Android/iOS POS BLE Service
  '0000fee7-0000-1000-8000-00805f9b34fb', // Wechat / Mini POS Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic Custom BLE
];

class ThermalPrinterService {
  constructor() {
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.serialPort = null;
    this.serialWriter = null;
    
    // Load config from localStorage
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem('bakehouse_printer_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load printer config:', e);
    }
    return {
      mode: 'browser', // 'bluetooth', 'serial', or 'browser'
      paperSize: '58mm', // '58mm' (GOOJPRT PT-210) or '80mm'
      autoPrint: true,
      printerName: 'GOOJPRT PT-210 (58mm)',
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('bakehouse_printer_config', JSON.stringify(this.config));
    return this.config;
  }

  getConfig() {
    return this.config;
  }

  isBluetoothSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
  }

  isSerialSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.serial);
  }

  isConnected() {
    if (this.config.mode === 'bluetooth') {
      return Boolean(this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected);
    }
    if (this.config.mode === 'serial') {
      return Boolean(this.serialPort && this.serialPort.readable);
    }
    return true; // Browser printing is always ready
  }

  /**
   * Connect to GOOJPRT PT-210 via Web Bluetooth
   */
  async connectBluetooth() {
    if (!this.isBluetoothSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }

    try {
      console.log('Requesting Bluetooth Device for GOOJPRT PT-210...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_BLE_SERVICES,
      });

      console.log('Connecting to GATT Server on:', device.name || 'Bluetooth Printer');
      const server = await device.gatt.connect();

      // Search through services for a writable characteristic
      let writableChar = null;
      for (const serviceUuid of KNOWN_BLE_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writableChar = char;
              break;
            }
          }
          if (writableChar) break;
        } catch {
          // Continue searching other services
        }
      }

      // If not found in known list, discover all primary services
      if (!writableChar) {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                writableChar = char;
                break;
              }
            }
            if (writableChar) break;
          } catch {
            // Ignore error on protected service
          }
        }
      }

      if (!writableChar) {
        throw new Error('Connected to Bluetooth device, but could not find a writable print channel. Please try USB Serial or Browser Mode.');
      }

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = writableChar;
      this.saveConfig({
        mode: 'bluetooth',
        printerName: device.name || 'GOOJPRT PT-210',
      });

      device.addEventListener('gattserverdisconnected', () => {
        console.warn('Bluetooth printer disconnected.');
        this.bluetoothCharacteristic = null;
      });

      return {
        success: true,
        name: device.name || 'GOOJPRT PT-210',
      };
    } catch (err) {
      console.error('Bluetooth connection error:', err);
      throw err;
    }
  }

  /**
   * Connect to GOOJPRT PT-210 via USB Cable (Web Serial / COM Port)
   */
  async connectSerial() {
    if (!this.isSerialSupported()) {
      throw new Error('Web Serial is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      this.serialPort = port;
      this.saveConfig({
        mode: 'serial',
        printerName: 'USB Serial (GOOJPRT PT-210)',
      });

      return {
        success: true,
        name: 'USB Serial (GOOJPRT PT-210)',
      };
    } catch (err) {
      console.error('Serial connection error:', err);
      throw err;
    }
  }

  /**
   * Disconnect any direct hardware connection
   */
  async disconnect() {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch (e) {
        console.warn('Error closing serial port:', e);
      }
    }
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.serialPort = null;
    this.saveConfig({ mode: 'browser' });
  }

  /**
   * Build ESC/POS binary buffer for 58mm (32 chars) or 80mm (48 chars)
   */
  buildEscPosBytes(order, paperWidth = '58mm') {
    const is58 = paperWidth === '58mm';
    const cols = is58 ? 32 : 48;

    const ESC = 0x1B;
    const GS = 0x1D;

    const bytes = [];
    const encoder = new TextEncoder();

    const addBytes = (arr) => {
      for (let i = 0; i < arr.length; i++) bytes.push(arr[i]);
    };

    const addText = (str) => {
      const encoded = encoder.encode(str);
      for (let i = 0; i < encoded.length; i++) bytes.push(encoded[i]);
    };

    const addLine = (str = '') => {
      addText(str + '\n');
    };

    const padLine = (left, right, width = cols) => {
      const spaces = width - left.length - right.length;
      if (spaces <= 0) {
        return left.substring(0, width - right.length - 1) + ' ' + right;
      }
      return left + ' '.repeat(spaces) + right;
    };

    const divider = (char = '-') => char.repeat(cols);

    // 1. Initialize Printer (ESC @)
    addBytes([ESC, 0x40]);

    // 2. Center Align (ESC a 1) & Header
    addBytes([ESC, 0x61, 0x01]);
    
    // Bold + Double Height/Width for Brand Name
    addBytes([ESC, 0x45, 0x01]); // Bold ON
    addBytes([GS, 0x21, 0x11]);  // 2x Size
    addLine('BAKE HOUSE');

    // Normal size for tagline
    addBytes([GS, 0x21, 0x00]);  // 1x Size
    addBytes([ESC, 0x45, 0x00]); // Bold OFF
    addLine('Artisan Bakery & Boutique');
    addLine('Poblacion, Cordova, Cebu 6017');
    addLine('Tel: +63 (032) 496-8888');
    addLine('VAT Reg TIN: 000-847-293-000');
    addLine(divider('='));

    // Document Title
    addBytes([ESC, 0x45, 0x01]); // Bold ON
    addLine('OFFICIAL SALES INVOICE');
    addBytes([ESC, 0x45, 0x00]); // Bold OFF
    addLine(divider('-'));

    // Left Align for Meta Details
    addBytes([ESC, 0x61, 0x00]);
    addLine(`OR #: ${order.id || 'N/A'}`);
    addLine(`Date: ${order.date_time || order.created_at || new Date().toLocaleString()}`);
    addLine(`Cashier: ${order.cashier || 'Store'}`);
    addLine(`Customer: ${order.customer_name || 'Walk-in Customer'}`);
    addLine(`Type: In-Store Counter Sale`);
    addLine(divider('-'));

    // Items Table Header
    addBytes([ESC, 0x45, 0x01]); // Bold ON
    if (is58) {
      addLine(padLine('ITEM (QTY)', 'TOTAL', cols));
    } else {
      addLine(padLine('ITEM', 'QTY    PRICE    TOTAL', cols));
    }
    addBytes([ESC, 0x45, 0x00]); // Bold OFF
    addLine(divider('-'));

    // Items List
    const items = order.items || [];
    for (const item of items) {
      const name = item.name || item.product_name || 'Item';
      const qty = parseInt(item.quantity || 1, 10);
      const price = parseFloat(item.price || 0);
      const total = (qty * price).toFixed(2);

      if (is58) {
        // 58mm layout: Item on first line or compact
        const leftLabel = `${name} x${qty}`;
        if (leftLabel.length + total.length + 1 <= cols) {
          addLine(padLine(leftLabel, total, cols));
        } else {
          addLine(name);
          addLine(padLine(`  x${qty} @ ${price.toFixed(2)}`, total, cols));
        }
      } else {
        const itemCol = name.padEnd(20).substring(0, 20);
        const qtyCol = String(qty).padStart(4);
        const priceCol = price.toFixed(2).padStart(8);
        const totalCol = total.padStart(8);
        addLine(`${itemCol} ${qtyCol} ${priceCol} ${totalCol}`);
      }
    }
    addLine(divider('-'));

    // Financial Totals
    const subtotal = parseFloat(order.subtotal || order.total || 0).toFixed(2);
    const totalDue = parseFloat(order.total || 0).toFixed(2);
    const cash = parseFloat(order.cash_tendered || order.total || 0).toFixed(2);
    const change = parseFloat(order.change_amount || 0).toFixed(2);
    const vatable = parseFloat(order.vatable_sales || (parseFloat(totalDue) / 1.12)).toFixed(2);
    const vat = parseFloat(order.vat_amount || (parseFloat(totalDue) - parseFloat(vatable))).toFixed(2);

    addLine(padLine('SUBTOTAL:', `P${subtotal}`, cols));
    
    addBytes([ESC, 0x45, 0x01]); // Bold ON
    addLine(padLine('TOTAL AMOUNT DUE:', `P${totalDue}`, cols));
    addBytes([ESC, 0x45, 0x00]); // Bold OFF

    addLine(divider('-'));
    addLine(padLine('PAYMENT METHOD:', String(order.payment_method || 'CASH').toUpperCase(), cols));
    if (order.payment_method === 'Cash' || !order.payment_method) {
      addLine(padLine('CASH TENDERED:', `P${cash}`, cols));
      addLine(padLine('CHANGE DUE:', `P${change}`, cols));
    }
    if (order.ref_number) {
      addLine(padLine('REF / TRACE #:', order.ref_number, cols));
    }

    addLine(divider('-'));
    addLine(padLine('VATable Sales:', `P${vatable}`, cols));
    addLine(padLine('12% VAT Amount:', `P${vat}`, cols));
    addLine(divider('='));

    // Footer
    addBytes([ESC, 0x61, 0x01]); // Center Align
    addBytes([ESC, 0x45, 0x01]); // Bold ON
    addLine('THANK YOU FOR YOUR PURCHASE!');
    addBytes([ESC, 0x45, 0x00]); // Bold OFF
    addLine('Please keep this Official Invoice');
    addLine('for warranty and return inquiries.');
    addLine('Baked Fresh Daily with Love!');
    addLine('');
    addLine(divider('.'));
    addLine('');

    // Feed lines & Cut Paper
    addBytes([ESC, 0x64, 0x04]); // Feed 4 lines
    addBytes([GS, 0x56, 0x41, 0x00]); // Full Cut (or partial for printers with cutter)

    return new Uint8Array(bytes);
  }

  /**
   * Send binary ESC/POS data to Bluetooth printer in chunks
   */
  async sendToBluetooth(uint8Array) {
    if (!this.bluetoothCharacteristic) {
      throw new Error('Bluetooth printer not connected. Please connect your GOOJPRT PT-210 in Printer Settings.');
    }

    // BLE MTU packet size is typically 20 to 100 bytes; send in chunks of 50 bytes
    const chunkSize = 50;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      if (this.bluetoothCharacteristic.writeValueWithoutResponse) {
        await this.bluetoothCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.bluetoothCharacteristic.writeValue(chunk);
      }
      // Small 15ms delay between BLE packets to prevent buffer overflow on PT-210
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  /**
   * Send binary ESC/POS data to Web Serial port
   */
  async sendToSerial(uint8Array) {
    if (!this.serialPort || !this.serialPort.writable) {
      throw new Error('USB Serial printer not connected.');
    }

    const writer = this.serialPort.writable.getWriter();
    try {
      await writer.write(uint8Array);
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Print via Dedicated Hidden Iframe (Clean 58mm / 80mm for Windows Drivers)
   */
  printViaIframe(order, paperWidth = '58mm') {
    return new Promise((resolve) => {
      const is58 = paperWidth === '58mm';
      const widthCss = is58 ? '48mm' : '72mm';
      const pageSize = is58 ? '58mm auto' : '80mm auto';
      const fontSize = is58 ? '11px' : '12px';

      const items = order.items || [];
      const subtotal = parseFloat(order.subtotal || order.total || 0).toFixed(2);
      const totalDue = parseFloat(order.total || 0).toFixed(2);
      const cash = parseFloat(order.cash_tendered || order.total || 0).toFixed(2);
      const change = parseFloat(order.change_amount || 0).toFixed(2);
      const vatable = parseFloat(order.vatable_sales || (parseFloat(totalDue) / 1.12)).toFixed(2);
      const vat = parseFloat(order.vat_amount || (parseFloat(totalDue) - parseFloat(vatable))).toFixed(2);

      // Create temporary iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const itemsHtml = items.map((it) => {
        const name = it.name || it.product_name || 'Item';
        const qty = parseInt(it.quantity || 1, 10);
        const price = parseFloat(it.price || 0).toFixed(2);
        const tot = (qty * parseFloat(it.price || 0)).toFixed(2);
        return `
          <tr>
            <td style="text-align: left; padding: 2px 0;">${name}<br><small style="color:#444;">${qty}x @ ₱${price}</small></td>
            <td style="text-align: right; vertical-align: bottom; padding: 2px 0;">₱${tot}</td>
          </tr>
        `;
      }).join('');

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt - ${order.id || 'BH-POS'}</title>
          <style>
            @page {
              size: ${pageSize};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              width: ${widthCss};
              margin: 0 auto;
              padding: 6px 2px 20px 2px;
              font-family: 'Courier New', Courier, monospace;
              font-size: ${fontSize};
              line-height: 1.25;
              color: #000000;
              background: #FFFFFF;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000000;
              margin: 4px 0;
            }
            .double-divider {
              border-top: 1px solid #000000;
              border-bottom: 1px solid #000000;
              height: 2px;
              margin: 5px 0;
            }
            h1 {
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: inherit;
            }
            .meta-line {
              display: flex;
              justify-content: space-between;
              margin: 1px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: bold;
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="center">
            <h1>BAKE HOUSE</h1>
            <div>Artisan Bakery & Boutique</div>
            <div>Poblacion, Cordova, Cebu</div>
            <div>Tel: +63 (032) 496-8888</div>
            <div>TIN: 000-847-293-000</div>
          </div>
          <div class="double-divider"></div>
          <div class="center bold">OFFICIAL SALES INVOICE</div>
          <div class="divider"></div>
          <div class="meta-line"><span>OR #:</span><span>${order.id || 'N/A'}</span></div>
          <div class="meta-line"><span>Date:</span><span>${order.date_time || order.created_at || new Date().toLocaleDateString()}</span></div>
          <div class="meta-line"><span>Cashier:</span><span>${order.cashier || 'Store'}</span></div>
          <div class="meta-line"><span>Customer:</span><span>${order.customer_name || 'Walk-in'}</span></div>
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 2px;">ITEM</th>
                <th style="text-align: right; padding-bottom: 2px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>
          <div class="meta-line"><span>Subtotal:</span><span>₱${subtotal}</span></div>
          <div class="total-row"><span>TOTAL DUE:</span><span>₱${totalDue}</span></div>
          <div class="divider"></div>

          <div class="meta-line"><span>Payment:</span><span>${(order.payment_method || 'CASH').toUpperCase()}</span></div>
          ${order.payment_method === 'Cash' || !order.payment_method ? `
            <div class="meta-line"><span>Cash Tendered:</span><span>₱${cash}</span></div>
            <div class="meta-line"><span>Change:</span><span>₱${change}</span></div>
          ` : ''}
          ${order.ref_number ? `<div class="meta-line"><span>Ref #:</span><span>${order.ref_number}</span></div>` : ''}

          <div class="divider"></div>
          <div class="meta-line"><small>VATable Sales:</small><small>₱${vatable}</small></div>
          <div class="meta-line"><small>12% VAT:</small><small>₱${vat}</small></div>
          <div class="double-divider"></div>

          <div class="center" style="margin-top: 6px;">
            <div class="bold">THANK YOU!</div>
            <small>Please come again.</small>
          </div>
        </body>
        </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(receiptHtml);
      iframe.contentWindow.document.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print error:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve(true);
          }, 1000);
        }
      }, 350);
    });
  }

  /**
   * Master Print Method
   */
  async printReceipt(order, overridePaperSize = null) {
    const paperSize = overridePaperSize || this.config.paperSize || '58mm';
    const mode = this.config.mode || 'browser';

    console.log(`Printing receipt using mode: [${mode}], paper: [${paperSize}]`);

    if (mode === 'bluetooth') {
      try {
        if (!this.isConnected()) {
          console.log('Bluetooth disconnected. Reconnecting...');
          await this.connectBluetooth();
        }
        const bytes = this.buildEscPosBytes(order, paperSize);
        await this.sendToBluetooth(bytes);
        return { success: true, method: 'bluetooth' };
      } catch (err) {
        console.warn('Bluetooth print failed, falling back to clean iframe print:', err);
        await this.printViaIframe(order, paperSize);
        return { success: true, method: 'fallback-browser', error: err.message };
      }
    }

    if (mode === 'serial') {
      try {
        const bytes = this.buildEscPosBytes(order, paperSize);
        await this.sendToSerial(bytes);
        return { success: true, method: 'serial' };
      } catch (err) {
        console.warn('Serial print failed, falling back to clean iframe print:', err);
        await this.printViaIframe(order, paperSize);
        return { success: true, method: 'fallback-browser', error: err.message };
      }
    }

    // Default Browser / Iframe 58mm driver printing
    await this.printViaIframe(order, paperSize);
    return { success: true, method: 'browser' };
  }

  /**
   * Run a test print to verify GOOJPRT PT-210 alignment
   */
  async testPrint(overridePaperSize = null) {
    const testOrder = {
      id: 'BH-TEST-001',
      date_time: new Date().toLocaleString(),
      cashier: 'POS Admin',
      customer_name: 'Test Print Customer',
      payment_method: 'Cash',
      cash_tendered: 100.00,
      change_amount: 15.00,
      subtotal: 85.00,
      total: 85.00,
      vatable_sales: 75.89,
      vat_amount: 9.11,
      items: [
        { name: 'Butter Croissant', quantity: 1, price: 85.00 },
      ],
    };

    return await this.printReceipt(testOrder, overridePaperSize);
  }
}

export const thermalPrinterService = new ThermalPrinterService();
