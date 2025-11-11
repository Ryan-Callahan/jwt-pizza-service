const config = require('./config');
const os = require('os');

const PIZZA_FACTORY_ENDPOINT = `${config.factory.url}/api/order`

// Metrics stored in memory
const requests = {};
const pizzaPurchaseStats = {};
const userStats = {}
let loggedInUsers = 0

// Middleware to track requests
function requestTracker(req, res, next) {
  const begin = performance.now();

  res.on('finish', () => {
    try {
      const finish = performance.now();
      const latency = finish - begin;
      const endpoint = `[${req.method}] ${req.path}`;

      if (!requests[endpoint]) {
        requests[endpoint] = {
          count: 0,
          totalLatencyMs: 0,
          method: req.method,
          path: req.path,
        };
      }

      const request = requests[endpoint];
      request.count += 1;
      request.totalLatencyMs += latency;

      if (req.path === '/api/auth') {
        if (req.method === 'POST' || req.method === 'PUT') {
          if (!userStats[res.status]) {
            userStats[res.status] = {
              count: 0
            }
          }
          userStats[res.status].count += 1;
          if (res.status === 200) {
            loggedInUsers += 1
          }
        }

        if (req.method === 'DELETE' && res.status === 200) {
          loggedInUsers -= 1
        }
      }



    } catch (e) {
      console.error(`requestTracker encountered an error: ${e}`);
    }
  });

  next();
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function pizzaPurchase(status, latencyMs, order) {
  if (!pizzaPurchaseStats[status]) {
    pizzaPurchaseStats[status] = {
      count: 0,
      totalLatencyMs: 0,
      totalPrice: 0,
      totalPizzas: 0,
    };
  }

  const pizzas = Array.isArray(order?.items) ? order.items : [];
  const pizzaCount = pizzas.length;
  const orderPrice = pizzas.reduce((sum, pizza) => {
    return sum + ((typeof pizza.price === 'number') ? pizza.price : 0);
  }, 0);

  const stat = pizzaPurchaseStats[status];
  stat.count += 1;
  stat.totalLatencyMs += latencyMs;
  stat.totalPrice += orderPrice;
  stat.totalPizzas += pizzaCount
}

// This will periodically send metrics to Grafana
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const metrics = [];
    Object.keys(requests).forEach((endpoint) => {
      const request = requests[endpoint]
      metrics.push(createMetric('request_latency', request.totalLatencyMs, 'ms', 'sum', 'asDouble', {endpoint}));
      metrics.push(createMetric('requests', request.count, '1', 'sum', 'asInt', {endpoint, method: request.method, path: request.path}));
    });

    Object.keys(pizzaPurchaseStats).forEach((status) => {
      const stat = pizzaPurchaseStats[status];
      const attributes = {status, endpoint: PIZZA_FACTORY_ENDPOINT}

      metrics.push(createMetric('pizza_purchase_requests', stat.count, '1', 'sum', 'asInt', attributes))
      metrics.push(createMetric('pizza_purchase_latency_total', stat.totalLatencyMs, 'ms', 'sum', 'asDouble', attributes))
      metrics.push(createMetric('pizza_purchase_price_total', stat.totalPrice, '1', 'sum', 'asDouble', attributes))
      metrics.push(createMetric('pizza_purchase_pizza_total', stat.totalPizzas, '1', 'sum', 'asInt', attributes))
    })

    Object.keys(userStats).forEach((status) => {
      const userStat = userStats[status];
      metrics.push(createMetric('authentication_requests', userStat.count, '1', 'sum', 'asInt', {status}))
    })

    metrics.push(createMetric('active_users', loggedInUsers, '1', 'sum', 'asInt', {}))
    metrics.push(createMetric('cpu', getCpuUsagePercentage(), '%', 'gauge', 'asDouble', {}))
    metrics.push(createMetric('memory', getMemoryUsagePercentage(), '%', 'gauge', 'asDouble', {}))

    sendMetricToGrafana(metrics);
  }, 10000);
}

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const body = {
    resourceMetrics: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: config.metrics.source }}
          ],
        },
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status} ${response.text().catch(() => '')}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker, pizzaPurchase };