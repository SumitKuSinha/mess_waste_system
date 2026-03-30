/**
 * Simple Round-Robin Load Balancer for Gateway
 * Distributes requests across multiple service instances
 */

class LoadBalancer {
  constructor(serviceName, ports) {
    this.serviceName = serviceName;
    this.ports = ports; // Array of ports [5001, 5011, 5021]
    this.currentIndex = 0;
    console.log(`✅ Load Balancer initialized for ${serviceName}: ${ports.join(', ')}`);
  }

  /**
   * Get next server in round-robin fashion
   * Returns: localhost:Port (e.g., localhost:5001)
   */
  getNextServer() {
    const server = `http://localhost:${this.ports[this.currentIndex]}`;
    this.currentIndex = (this.currentIndex + 1) % this.ports.length;
    return server;
  }

  /**
   * Get current index for debugging
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Reset balancer (for testing)
   */
  reset() {
    this.currentIndex = 0;
  }
}

module.exports = LoadBalancer;