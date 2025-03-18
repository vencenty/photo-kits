<template>
  <div class="success-page">
    <div class="container">
      <div class="success-card apple-card">
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        
        <h1 class="success-title">上传成功！</h1>
        <p class="success-message">您的照片已成功上传，我们将尽快处理您的订单。</p>
        
        <div class="success-actions">
          <button 
            type="button" 
            class="apple-button"
            @click="goHome"
          >
            返回首页
          </button>
          
          <button 
            type="button"
            class="apple-button secondary"
            @click="uploadMore"
          >
            继续上传
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

const uploadMore = () => {
  router.push('/');
};
</script>

<style lang="scss" scoped>
.success-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: 40px 0;
}

.success-card {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: 48px;
}

.success-icon {
  margin-bottom: 24px;
  color: #4cd964; // Apple green
  
  svg {
    width: 80px;
    height: 80px;
  }
}

.success-title {
  font-size: 36px;
  margin-bottom: 16px;
}

.success-message {
  font-size: 18px;
  color: var(--apple-gray);
  margin-bottom: 40px;
}

.success-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  
  .apple-button {
    min-width: 140px;
    padding: 12px 24px;
    font-size: 16px;
  }
}

@media (max-width: 768px) {
  .success-card {
    padding: 32px 24px;
  }
  
  .success-icon svg {
    width: 64px;
    height: 64px;
  }
  
  .success-title {
    font-size: 28px;
  }
  
  .success-message {
    font-size: 16px;
  }
  
  .success-actions {
    flex-direction: column;
    
    .apple-button {
      width: 100%;
    }
  }
}
</style> 