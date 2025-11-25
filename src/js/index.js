function tradingApp() {
  return {
    initialBalance: 1000,
    currentBalance: 1000,
    netProfit: 0,
    winRate: 0,
    profitFactor: 0,
    entries: [],
    showModal: false,

    form: {
      pair: "",
      date: "",
      type: "buy",
      lot: 0.01,
      strategy: "SMC",
      entryPrice: null,
      slPrice: null,
      tpPrice: null,
      outcome: "", // 'TP' or 'SL'
    },

    // Computed property for sorting (newest first for table)
    get sortedEntries() {
      return this.entries
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    initApp() {
      // Load from LocalStorage
      const storedData = localStorage.getItem("forexJournalData_v2");
      if (storedData) {
        const parsed = JSON.parse(storedData);
        this.initialBalance = parsed.initialBalance || 1000;
        this.entries = parsed.entries || [];
      }

      // Set Default Date for Form
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      this.form.date = now.toISOString().slice(0, 16);

      this.recalculateStats();

      // Watcher to Auto-Save
      this.$watch("entries", () => {
        this.saveData();
        this.recalculateStats();
      });
      this.$watch("initialBalance", () => {
        this.saveData();
        this.recalculateStats();
      });
    },

    saveData() {
      const data = {
        initialBalance: this.initialBalance,
        entries: this.entries,
      };
      localStorage.setItem("forexJournalData_v2", JSON.stringify(data));
    },

    clearData() {
      if (confirm("Apakah Anda yakin ingin menghapus semua data jurnal?")) {
        this.entries = [];
        this.initialBalance = 1000;
        localStorage.removeItem("forexJournalData_v2");
        window.location.reload();
      }
    },

    // --- LOGIKA UTAMA (Core Logic) ---
    calculateProfit(entryData, exitPrice) {
      const pair = entryData.pair.toUpperCase();
      const type = entryData.type;
      const open = parseFloat(entryData.entryPrice);
      const close = parseFloat(exitPrice);
      const lot = parseFloat(entryData.lot);

      let diff = 0;
      if (type === "buy") diff = close - open;
      else diff = open - close;

      // Logic Multiplier (Contract Size)
      let multiplier = 100000; // Standard Forex

      // Logika Deteksi Pair
      if (pair.includes("JPY")) {
        multiplier = 1000; // JPY Pairs multiplier approx
      } else if (pair.includes("XAU") || pair.includes("GOLD")) {
        multiplier = 100; // Gold Contract Size 100
      } else if (pair.includes("BTC")) {
        multiplier = 1; // Crypto usually 1:1
      } else if (pair.includes("NAS") || pair.includes("US30")) {
        multiplier = 10; // Indices approx
      }

      // Rumus Dasar: (Price Delta) * Lot * ContractSize
      return diff * lot * multiplier;
    },

    calculateRR(entry, sl, tp, type) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk === 0) return 0;
      return (reward / risk).toFixed(2);
    },

    addEntry() {
      if (!this.form.outcome) {
        alert("Pilih hasil trade (TP atau SL) dulu!");
        return;
      }

      // Tentukan Exit Price berdasarkan Outcome
      const exitPrice =
        this.form.outcome === "TP" ? this.form.tpPrice : this.form.slPrice;

      // Hitung P/L
      const profitValue = this.calculateProfit(this.form, exitPrice);

      // Hitung RR
      const rrValue = this.calculateRR(
        this.form.entryPrice,
        this.form.slPrice,
        this.form.tpPrice,
        this.form.type
      );

      const newRecord = {
        id: Date.now(),
        pair: this.form.pair.toUpperCase(),
        date: this.form.date,
        type: this.form.type,
        strategy: this.form.strategy,
        lot: this.form.lot,
        entryPrice: this.form.entryPrice,
        slPrice: this.form.slPrice,
        tpPrice: this.form.tpPrice,
        outcome: this.form.outcome === "TP" ? "WIN" : "LOSS",
        profit: profitValue,
        rrRatio: rrValue,
      };

      this.entries.push(newRecord);
      this.showModal = false;

      // Reset form partial
      this.form.outcome = "";
      this.form.entryPrice = null;
      this.form.slPrice = null;
      this.form.tpPrice = null;
    },

    deleteEntry(id) {
      if (confirm("Hapus entry ini?")) {
        this.entries = this.entries.filter((e) => e.id !== id);
      }
    },

    recalculateStats() {
      // Urutkan entry berdasarkan tanggal (terlama ke terbaru untuk kalkulasi saldo berjalan)
      const chronological = this.entries
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBalance = this.initialBalance;
      let totalWin = 0;
      let totalLoss = 0;
      let winCount = 0;

      chronological.forEach((e) => {
        runningBalance += e.profit;
        if (e.profit > 0) {
          totalWin += e.profit;
          winCount++;
        } else {
          totalLoss += Math.abs(e.profit);
        }
      });

      this.currentBalance = runningBalance;
      this.netProfit = runningBalance - this.initialBalance;
      this.winRate =
        this.entries.length > 0
          ? ((winCount / this.entries.length) * 100).toFixed(1)
          : 0;
      this.profitFactor =
        totalLoss === 0
          ? totalWin > 0
            ? "∞"
            : 0
          : (totalWin / totalLoss).toFixed(2);
    },

    // --- HELPERS ---
    formatCurrency(value) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    },
    formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  };
}
